const OPENAI_URL = "https://api.openai.com/v1/responses";

const designKeys = [
  "twoMeans",
  "pairedMeans",
  "oneMeanPrecision",
  "twoProportions",
  "oneProportionPrecision",
  "correlation",
  "anova",
  "equivalence",
  "survival",
  "diagnostic",
  "regression",
  "animalResource"
];

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "protocol",
    "assumptions",
    "missingAssumptions",
    "agentReviews",
    "similarStudyQueries",
    "suggestions",
    "warnings",
    "confidence"
  ],
  properties: {
    protocol: {
      type: "object",
      additionalProperties: false,
      required: ["setting", "experimentalUnit", "endpoint", "endpointType", "comparison", "designKey", "reason"],
      properties: {
        setting: { type: "string" },
        experimentalUnit: { type: "string" },
        endpoint: { type: "string" },
        endpointType: { type: "string" },
        comparison: { type: "string" },
        designKey: { type: "string", enum: designKeys },
        reason: { type: "string" }
      }
    },
    assumptions: {
      type: "object",
      additionalProperties: false,
      required: [
        "delta",
        "sd",
        "sdDiff",
        "margin",
        "p1",
        "p2",
        "p",
        "r",
        "groups",
        "f",
        "trueDiff",
        "hr",
        "eventRate",
        "sensitivity",
        "specificity",
        "predictors",
        "eventsPerPredictor",
        "targetE",
        "alpha",
        "power",
        "attrition",
        "ratio"
      ],
      properties: {
        delta: numericOrNull(),
        sd: numericOrNull(),
        sdDiff: numericOrNull(),
        margin: numericOrNull(),
        p1: numericOrNull(),
        p2: numericOrNull(),
        p: numericOrNull(),
        r: numericOrNull(),
        groups: numericOrNull(),
        f: numericOrNull(),
        trueDiff: numericOrNull(),
        hr: numericOrNull(),
        eventRate: numericOrNull(),
        sensitivity: numericOrNull(),
        specificity: numericOrNull(),
        predictors: numericOrNull(),
        eventsPerPredictor: numericOrNull(),
        targetE: numericOrNull(),
        alpha: numericOrNull(),
        power: numericOrNull(),
        attrition: numericOrNull(),
        ratio: numericOrNull()
      }
    },
    missingAssumptions: { type: "array", items: { type: "string" } },
    agentReviews: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["agent", "decision", "rationale", "confidence"],
        properties: {
          agent: { type: "string" },
          decision: { type: "string" },
          rationale: { type: "string" },
          confidence: { type: "number" }
        }
      }
    },
    similarStudyQueries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["database", "query", "purpose"],
        properties: {
          database: { type: "string" },
          query: { type: "string" },
          purpose: { type: "string" }
        }
      }
    },
    suggestions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    confidence: { type: "number" }
  }
};

function numericOrNull() {
  return { anyOf: [{ type: "number" }, { type: "null" }] };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(200, { aiAvailable: false, error: "OPENAI_API_KEY is not configured." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { aiAvailable: false, error: "Invalid JSON body." });
  }

  const studyText = String(body.studyText || "").slice(0, 45000);
  const endpoint = String(body.endpoint || "").slice(0, 500);
  const setting = String(body.setting || "").slice(0, 120);
  const references = Array.isArray(body.references) ? body.references.slice(0, 12) : [];

  if (studyText.trim().length < 40) {
    return json(400, { aiAvailable: false, error: "Study text is too short for AI analysis." });
  }

  try {
    const analysis = await runConsensusAnalysis({ apiKey, studyText, endpoint, setting, references });
    return json(200, { aiAvailable: true, analysis });
  } catch (error) {
    return json(200, {
      aiAvailable: false,
      error: "AI analysis failed. Local protocol-first analysis was used instead.",
      detail: error.message
    });
  }
};

async function runConsensusAnalysis({ apiKey, studyText, endpoint, setting, references }) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const input = [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text:
            "You are a consensus panel of academic biostatistics agents. Return only JSON that matches the schema. Do not invent exact values. If a required sample-size assumption is absent, set it to null and list it in missingAssumptions. Use similar studies only as support, not as proof. Distinguish biological replicates from technical replicates. Choose one designKey from the enum."
        }
      ]
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: JSON.stringify(
            {
              task:
                "Analyze this study for automatic sample-size planning. Act as three agents: protocol reader, biostatistician, and literature matcher. Then provide an adjudicated consensus.",
              endpointProvidedByUser: endpoint,
              settingProvidedByUser: setting,
              similarStudiesProvidedByUser: references,
              studyText
            },
            null,
            2
          )
        }
      ]
    }
  ];

  const payload = {
    model,
    input,
    text: {
      format: {
        type: "json_schema",
        name: "study_sample_size_analysis",
        strict: true,
        schema
      }
    }
  };

  if (String(process.env.ENABLE_OPENAI_WEB_SEARCH || "").toLowerCase() === "true") {
    payload.tools = [{ type: "web_search_preview" }];
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed with ${response.status}`);
  }

  const text = data.output_text || extractOutputText(data);
  if (!text) throw new Error("No structured output returned.");
  return JSON.parse(text);
}

function extractOutputText(data) {
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  };
}
