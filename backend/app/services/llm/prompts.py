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

IMPACT_CLASSIFIER_PROMPT = """
Analyze the user's query: "<user_input>{query}</user_input>"
Classify it into one of the following types:
- code_change: A specific request to modify, add, or remove code (e.g., "Add 2FA", "Fix bug in login").
- tech_integration: A request about how a specific external technology/service would work or be integrated (e.g., "How would Razorpay integration work?", "Add Stripe").
- architecture_question: A question about how the system is designed or structured (e.g., "How does auth work?").
- process_question: A question about a runtime flow or process (e.g., "What happens when a payment fails?").
- needs_clarification: A vague query that cannot be answered without more information (e.g., "add x", "make it better").

If the query is vague, provide 2-3 specific questions to clarify their intent.

Return ONLY valid JSON matching this schema:
{{
  "type": "code_change|tech_integration|architecture_question|process_question|needs_clarification",
  "confidence": 0.0,
  "clarification_questions": ["Question 1?", "Question 2?"] // Only if needs_clarification
}}
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

TECH_INTEGRATION_PROMPT = """
You are a senior software architect analyzing a codebase for a new technology integration.
Technology / Feature requested: <user_input>{feature_description}</user_input>

Codebase context:
{context}

Based on your general knowledge of this technology and the specific codebase context, provide a comprehensive integration guide.
Return ONLY valid JSON matching this schema:
{{
  "technology": "The technology being integrated",
  "summary": "High-level summary of the integration strategy",
  "integration_steps": [
    {{"step": 1, "title": "Step title", "description": "Detailed description", "files": ["optional_file.py"]}}
  ],
  "files_to_modify": [{{"path": "...", "reason": "...", "change_type": "modify|create|delete", "priority": "critical|high|medium|low", "suggested_changes": "..."}}],
  "files_to_create": [{{"suggested_path": "...", "reason": "...", "priority": "..."}}],
  "dependencies_to_add": ["list of package names"],
  "estimated_complexity": "low|medium|high|very_high"
}}
"""

ARCHITECTURE_QUESTION_PROMPT = """
You are a senior software architect explaining the codebase.
Developer question: <user_input>{query}</user_input>

Codebase context:
{context}

Provide a clear answer referencing the specific files and flows.
Return ONLY valid JSON matching this schema:
{{
  "answer": "Detailed textual explanation...",
  "relevant_files": ["list of file paths mentioned"],
  "execution_flow": [
    {{"step": 1, "description": "Step description", "file": "optional_file_path"}}
  ]
}}
"""

CLARIFICATION_SYNTHESIS_PROMPT = """
You are a helpful AI assistant.
The user originally asked: "<user_input>{original_query}</user_input>"
We asked for clarification, and here is the conversation history:
{conversation_history}

Codebase context:
{context}

Synthesize a helpful answer based on their clarifications.
Return ONLY valid JSON matching this schema:
{{
  "answer": "Detailed answer synthesizing the discussion...",
  "relevant_files": ["list of file paths mentioned"]
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
