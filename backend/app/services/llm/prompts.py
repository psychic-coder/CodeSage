IMPACT_INTENT_PROMPT = """
Given this feature request: "<user_input>{feature_description}</user_input>"
Extract the following as JSON:
{{
  "primary_domain": "...",
  "entities_affected": [...],
  "action_types": [...],
  "keywords": [...],
  "confidence": 0.0
}}
Return ONLY valid JSON.
"""

IMPACT_SYNTHESIS_PROMPT = """
You are a senior software architect analyzing a codebase.
Feature request: <user_input>{feature_description}</user_input>

Codebase context:
{context}

Impacted files found via dependency analysis:
{impacted_files}

Return ONLY this JSON structure:
{{
  "files_to_modify": [{{"path": "...", "reason": "...", "change_type": "modify|create|delete", "priority": "critical|high|medium|low", "suggested_changes": "..."}}],
  "files_to_create": [{{"suggested_path": "...", "reason": "...", "priority": "..."}}],
  "downstream_risks": [{{"file": "...", "risk": "...", "risk_level": "high|medium|low"}}],
  "dependencies_to_add": [...],
  "estimated_complexity": "low|medium|high|very_high",
  "implementation_order": [...]
}}
"""

ARCHITECTURE_ANALYSIS_PROMPT = """
You are a senior software architect. Based on the following codebase analysis data:

{analysis_data}

Provide a comprehensive architecture assessment as JSON:
{{
  "overall_health_score": 0,
  "health_label": "...",
  "issues": [{{"type": "...", "severity": "...", "title": "...", "description": "...", "involved_files": [...], "suggested_fix": "..."}}],
  "strengths": [...],
  "architecture_pattern": "...",
  "scalability_assessment": "..."
}}
"""

IMPROVEMENT_ANALYSIS_PROMPT = """
Analyze this codebase for {categories} issues.

Code context:
{context}

Return a JSON array of improvement suggestions:
[{{
  "id": "...",
  "category": "security|performance|refactoring",
  "severity": "critical|high|medium|low",
  "title": "...",
  "file": "...",
  "line_range": [0, 0],
  "code_snippet": "...",
  "explanation": "...",
  "suggested_fix": "...",
  "effort": "low|medium|high"
}}]
"""

FEATURE_RECOMMENDATION_PROMPT = """
This is a {domain} application with these existing features: {existing_features}.

Architecture summary: {arch_summary}

Suggest 5 logical next features as JSON:
{{
  "detected_domain": "...",
  "existing_features": [...],
  "recommendations": [{{
    "feature": "...",
    "rationale": "...",
    "complexity": "low|medium|high",
    "files_to_create": [...],
    "files_to_modify": [...],
    "dependencies_needed": [...]
  }}]
}}
"""

ONBOARDING_GUIDE_PROMPT = """
A developer is asking about: <user_input>{topic}</user_input>

Codebase context:
{context}

Generate an onboarding guide as JSON:
{{
  "topic": "...",
  "summary": "...",
  "entry_points": [...],
  "execution_flow": [{{"step": 1, "file": "...", "function": "...", "description": "..."}}],
  "key_files": [...],
  "suggested_reading_order": [...],
  "data_models_involved": [...],
  "external_dependencies": [...],
  "gotchas": [...]
}}
"""

PROPAGATION_ANALYSIS_PROMPT = """
Analyze why changes to this file would impact other files:
{context}

Explain the risk in 2-3 sentences.
"""

GRAPH_RAG_QUERY_PROMPT = """
You are a codebase expert. Answer the developer's question based on the code context provided.

Code context:
{context}

Developer question: <user_input>{query}</user_input>

Answer clearly and specifically, referencing file names and functions where relevant.
"""
