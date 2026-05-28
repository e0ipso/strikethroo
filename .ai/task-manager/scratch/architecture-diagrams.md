# Architecture Diagrams - File-Based vs MCP

**Visual comparison of current and proposed architectures**

---

## Current Architecture (File-Based)

### Initialization Flow

```mermaid
graph TB
    User[User runs: npx ai-task-manager init --assistants claude,gemini]

    User --> CLI[CLI Parser]
    CLI --> Validate[Validate Assistants]
    Validate --> CreateDirs[Create Directory Structures]

    CreateDirs --> ClaudeDir[.claude/commands/tasks/]
    CreateDirs --> GeminiDir[.gemini/commands/tasks/]
    CreateDirs --> SharedDir[.ai/task-manager/]

    CreateDirs --> ProcessTemplates[Process Templates]

    ProcessTemplates --> ReadMD[Read Markdown Templates]
    ReadMD --> ConvertTOML[Convert to TOML for Gemini]
    ReadMD --> KeepMD[Keep Markdown for Claude]

    ConvertTOML --> CopyGemini[Copy to .gemini/]
    KeepMD --> CopyClaude[Copy to .claude/]

    CopyGemini --> Done[✓ Initialization Complete]
    CopyClaude --> Done

    style User fill:#e1f5ff
    style Done fill:#d4edda
```

### Command Execution Flow

```mermaid
graph LR
    User[User types: /tasks:create-plan]

    User --> Claude[Claude Code]
    Claude --> ReadFile[Read .claude/commands/tasks/create-plan.md]
    ReadFile --> ParseFront[Parse Frontmatter]
    ParseFront --> Execute[Execute Prompt]
    Execute --> AI[AI Processes Request]

    User2[User types: /tasks:create-plan] --> Gemini[Gemini]
    Gemini --> ReadTOML[Read .gemini/commands/tasks/create-plan.toml]
    ReadTOML --> ParseTOML[Parse TOML]
    ParseTOML --> Execute2[Execute Prompt]
    Execute2 --> AI2[AI Processes Request]

    style User fill:#e1f5ff
    style User2 fill:#e1f5ff
    style AI fill:#d4edda
    style AI2 fill:#d4edda
```

### Template Update Flow

```mermaid
graph TB
    EditSource[Edit: templates/ai-task-manager/config/templates/PLAN_TEMPLATE.md]

    EditSource --> Build[npm run build]
    Build --> ReInit[npx ai-task-manager init --force]

    ReInit --> Convert1[Convert MD → TOML]
    ReInit --> Convert2[Keep MD]
    ReInit --> Convert3[Convert MD → GitHub Format]

    Convert1 --> Copy1[Copy to .gemini/commands/tasks/]
    Convert2 --> Copy2[Copy to .claude/commands/tasks/]
    Convert3 --> Copy3[Copy to .github/prompts/]

    Copy1 --> Verify[Verify All Formats]
    Copy2 --> Verify
    Copy3 --> Verify

    Verify --> Done[✓ Update Complete]

    style EditSource fill:#fff3cd
    style Done fill:#d4edda
```

### Directory Structure

```mermaid
graph TB
    Project[Project Root]

    Project --> Claude[.claude/]
    Project --> Gemini[.gemini/]
    Project --> OpenCode[.opencode/]
    Project --> Codex[.codex/]
    Project --> GitHub[.github/]
    Project --> AI[.ai/task-manager/]

    Claude --> ClaudeCommands[commands/tasks/]
    ClaudeCommands --> ClaudeFiles["create-plan.md<br/>generate-tasks.md<br/>execute-blueprint.md<br/>..."]

    Gemini --> GeminiCommands[commands/tasks/]
    GeminiCommands --> GeminiFiles["create-plan.toml<br/>generate-tasks.toml<br/>execute-blueprint.toml<br/>..."]

    OpenCode --> OpenCodeCommand[command/tasks/]
    OpenCodeCommand --> OpenCodeFiles["create-plan.md<br/>generate-tasks.md<br/>..."]

    Codex --> CodexPrompts[prompts/]
    CodexPrompts --> CodexFiles["tasks-create-plan.md<br/>tasks-generate-tasks.md<br/>..."]

    GitHub --> GitHubPrompts[prompts/]
    GitHubPrompts --> GitHubFiles["tasks-create-plan.prompt.md<br/>tasks-generate-tasks.prompt.md<br/>..."]

    AI --> Plans[plans/]
    AI --> Archive[archive/]
    AI --> Config[config/]

    Config --> Templates[templates/]
    Config --> Hooks[hooks/]
    Config --> Scripts[scripts/]

    style Project fill:#e1f5ff
    style AI fill:#d4edda
    style ClaudeFiles fill:#fff3cd
    style GeminiFiles fill:#fff3cd
    style OpenCodeFiles fill:#fff3cd
    style CodexFiles fill:#fff3cd
    style GitHubFiles fill:#fff3cd
```

---

## MCP Architecture

### Initialization Flow

```mermaid
graph TB
    User[User runs: ai-task-manager-mcp init]

    User --> CreateShared[Create .ai/task-manager/]

    CreateShared --> Plans[plans/]
    CreateShared --> Archive[archive/]
    CreateShared --> Config[config/]

    Config --> Templates[templates/]
    Config --> Hooks[hooks/]
    Config --> Scripts[scripts/]

    Templates --> PlanTemplate[PLAN_TEMPLATE.md]
    Templates --> TaskTemplate[TASK_TEMPLATE.md]
    Templates --> BlueprintTemplate[BLUEPRINT_TEMPLATE.md]

    CreateShared --> MCPConfig[Generate .mcp.json]

    MCPConfig --> Done[✓ Initialization Complete<br/>Ready for MCP configuration]

    style User fill:#e1f5ff
    style Done fill:#d4edda
```

### MCP Configuration

```mermaid
graph LR
    Init[Project Initialized]

    Init --> UserConfig[User configures assistant]

    UserConfig --> Claude[Claude: claude mcp add ai-task-manager]
    UserConfig --> Copilot[Copilot: Edit .mcp.json]
    UserConfig --> Cursor[Cursor: Edit config]

    Claude --> MCPServers1[~/.claude.json:<br/>mcpServers: ai-task-manager]
    Copilot --> MCPServers2[.mcp.json:<br/>mcpServers: ai-task-manager]
    Cursor --> MCPServers3[Cursor config:<br/>mcpServers: ai-task-manager]

    MCPServers1 --> Ready[✓ Ready to Use]
    MCPServers2 --> Ready
    MCPServers3 --> Ready

    style Init fill:#e1f5ff
    style Ready fill:#d4edda
```

### Command Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant Assistant
    participant MCP as MCP Server
    participant FS as File System

    User->>Assistant: /mcp__ai-task-manager__tasks-create-plan "Add dark mode"

    Assistant->>MCP: MCP Request<br/>GetPrompt(name: tasks-create-plan, args: {prompt: "Add dark mode"})

    MCP->>FS: Find .ai/task-manager/
    FS-->>MCP: /path/to/project/.ai/task-manager

    MCP->>FS: Read PLAN_TEMPLATE.md
    FS-->>MCP: Template content

    MCP->>FS: Read PRE_PLAN.md hook
    FS-->>MCP: Hook content

    MCP->>MCP: Substitute variables<br/>$ARGUMENTS → "Add dark mode"

    MCP->>MCP: Inject hooks

    MCP-->>Assistant: Formatted prompt with<br/>template + hooks + substitutions

    Assistant->>Assistant: Execute prompt

    Assistant-->>User: AI creates plan in<br/>.ai/task-manager/plans/
```

### Template Update Flow

```mermaid
graph TB
    EditTemplate[Edit: .ai/task-manager/config/templates/PLAN_TEMPLATE.md]

    EditTemplate --> Save[Save File]
    Save --> Done[✓ Update Complete]

    Done -.->|Next command invocation| MCP[MCP Server reads new template]
    MCP -.-> Execute[AI uses updated template]

    style EditTemplate fill:#fff3cd
    style Done fill:#d4edda
    style Execute fill:#d4edda
```

### Directory Structure

```mermaid
graph TB
    Project[Project Root]

    Project --> MCPConfig[.mcp.json]
    Project --> AI[.ai/task-manager/]

    AI --> Plans[plans/]
    AI --> Archive[archive/]
    AI --> Config[config/]

    Config --> Templates[templates/]
    Config --> Hooks[hooks/]
    Config --> Scripts[scripts/]

    Templates --> PlanTemplate[PLAN_TEMPLATE.md]
    Templates --> TaskTemplate[TASK_TEMPLATE.md]
    Templates --> BlueprintTemplate[BLUEPRINT_TEMPLATE.md]
    Templates --> ExecTemplate[EXECUTION_SUMMARY_TEMPLATE.md]

    Hooks --> PrePlan[PRE_PLAN.md]
    Hooks --> PostPlan[POST_PLAN.md]
    Hooks --> PrePhase[PRE_PHASE.md]
    Hooks --> PostPhase[POST_PHASE.md]

    Scripts --> NextPlanID[get-next-plan-id.cjs]
    Scripts --> NextTaskID[get-next-task-id.cjs]
    Scripts --> DetectAssistant[detect-assistant.cjs]

    Plans --> Plan28[28--feature-name/]
    Plan28 --> PlanFile[plan-28--feature-name.md]
    Plan28 --> Tasks[tasks/]

    style Project fill:#e1f5ff
    style AI fill:#d4edda
```

---

## Side-by-Side Comparison

### Initialization

```mermaid
graph TB
    subgraph "File-Based (Current)"
        FB_User[User] --> FB_Init[npx ai-task-manager init<br/>--assistants claude,gemini]
        FB_Init --> FB_Create5[Create 5 directory structures]
        FB_Create5 --> FB_Convert[Convert templates to 3 formats]
        FB_Convert --> FB_Copy[Copy ~40 files]
        FB_Copy --> FB_Done[✓ Done]
    end

    subgraph "MCP Approach"
        MCP_User[User] --> MCP_Init[ai-task-manager-mcp init]
        MCP_Init --> MCP_Create1[Create 1 directory structure]
        MCP_Create1 --> MCP_Copy[Copy ~15 files<br/>single format]
        MCP_Copy --> MCP_Config[Configure MCP client]
        MCP_Config --> MCP_Done[✓ Done]
    end

    style FB_Done fill:#d4edda
    style MCP_Done fill:#d4edda
```

### Command Execution

```mermaid
graph LR
    subgraph "File-Based"
        FB_Cmd[User: /tasks:create-plan] --> FB_Read[Read static file]
        FB_Read --> FB_Exec[Execute]
    end

    subgraph "MCP Approach"
        MCP_Cmd[User: /mcp__ai-task-manager__tasks-create-plan] --> MCP_Req[MCP Request]
        MCP_Req --> MCP_Server[MCP Server]
        MCP_Server --> MCP_Read[Read template]
        MCP_Read --> MCP_Process[Process + substitute]
        MCP_Process --> MCP_Return[Return to assistant]
        MCP_Return --> MCP_Exec[Execute]
    end

    style FB_Exec fill:#d4edda
    style MCP_Exec fill:#d4edda
```

### Template Updates

```mermaid
graph TB
    subgraph "File-Based (5 steps)"
        FB_Edit[1. Edit source template] --> FB_Build[2. npm run build]
        FB_Build --> FB_ReInit[3. Re-run init --force]
        FB_ReInit --> FB_Verify[4. Verify 5 formats]
        FB_Verify --> FB_Restart[5. Restart assistant if needed]
    end

    subgraph "MCP Approach (1 step)"
        MCP_Edit[1. Edit template] --> MCP_Done[✓ Done<br/>next invocation uses new version]
    end

    style FB_Restart fill:#fff3cd
    style MCP_Done fill:#d4edda
```

---

## MCP Server Internal Architecture

### Server Components

```mermaid
graph TB
    Client[MCP Client<br/>Claude/Copilot/Cursor/etc.]

    Client -->|stdio transport| Server[MCP Server]

    Server --> Handlers[Request Handlers]

    Handlers --> ListPrompts[ListPrompts Handler]
    Handlers --> GetPrompt[GetPrompt Handler]

    GetPrompt --> TemplateEngine[Template Engine]
    GetPrompt --> HookSystem[Hook System]
    GetPrompt --> ScriptRunner[Script Runner]

    TemplateEngine --> FindProject[Find .ai/task-manager/]
    TemplateEngine --> ReadTemplate[Read Template]
    TemplateEngine --> Substitute[Variable Substitution]

    HookSystem --> LoadHooks[Load Hooks]
    HookSystem --> InjectHooks[Inject into Prompt]

    ScriptRunner --> ExecID[Execute get-next-*-id.cjs]

    FindProject --> FileSystem[File System]
    ReadTemplate --> FileSystem
    LoadHooks --> FileSystem
    ExecID --> FileSystem

    style Server fill:#e1f5ff
    style FileSystem fill:#d4edda
```

### Prompt Generation Pipeline

```mermaid
graph LR
    Request[MCP GetPrompt Request]

    Request --> Validate[Validate Arguments]
    Validate --> FindProj[Find Project<br/>.ai/task-manager/]
    FindProj --> LoadTemplate[Load Template<br/>from templates/]
    LoadTemplate --> LoadHooks[Load Hooks<br/>from hooks/]
    LoadHooks --> Substitute[Substitute Variables<br/>$ARGUMENTS → value]
    Substitute --> InjectHooks[Inject Hooks<br/>PRE_* and POST_*]
    InjectHooks --> Format[Format Response]
    Format --> Return[Return to Client]

    style Request fill:#e1f5ff
    style Return fill:#d4edda
```

---

## Multi-Assistant Support Comparison

### Current (Hardcoded Support)

```mermaid
graph TB
    CLI[AI Task Manager CLI]

    CLI -->|Markdown| Claude[Claude Code]
    CLI -->|TOML| Gemini[Gemini]
    CLI -->|Markdown| OpenCode[Open Code]
    CLI -->|Markdown flat| Codex[Codex CLI]
    CLI -->|Markdown .prompt| GitHub[GitHub Copilot]

    CLI -.->|Requires code changes| NewAssistant[New Assistant?]

    style CLI fill:#e1f5ff
    style NewAssistant fill:#f8d7da
```

### MCP (Universal Support)

```mermaid
graph TB
    MCP[MCP Server<br/>ai-task-manager]

    MCP -->|MCP Protocol| Claude[Claude Code]
    MCP -->|MCP Protocol| Gemini[Gemini]
    MCP -->|MCP Protocol| Copilot[GitHub Copilot]
    MCP -->|MCP Protocol| Cursor[Cursor]
    MCP -->|MCP Protocol| Windsurf[Windsurf]
    MCP -->|MCP Protocol| Continue[Continue]
    MCP -->|MCP Protocol| Cline[Cline]
    MCP -->|MCP Protocol| Future[Any Future MCP Client]

    style MCP fill:#e1f5ff
    style Future fill:#d4edda
```

---

## Migration Flow

### Automated Migration Process

```mermaid
graph TB
    Start[User runs: npx ai-task-manager migrate-to-mcp]

    Start --> Detect[Detect Existing Installation]

    Detect --> Found{Found<br/>assistant<br/>configs?}

    Found -->|No| Error[Error: No existing installation]
    Found -->|Yes| Analyze[Analyze Configurations]

    Analyze --> Show[Show detected assistants]
    Show --> Preserve[Preserve .ai/task-manager/<br/>no changes]

    Preserve --> Remove[Remove obsolete directories]
    Remove --> RemoveClaude[Remove .claude/commands/]
    Remove --> RemoveGemini[Remove .gemini/commands/]
    Remove --> RemoveOthers[Remove others...]

    RemoveClaude --> Generate[Generate .mcp.json]
    RemoveGemini --> Generate
    RemoveOthers --> Generate

    Generate --> Instructions[Display setup instructions]
    Instructions --> Done[✓ Migration Complete]

    style Start fill:#e1f5ff
    style Done fill:#d4edda
    style Error fill:#f8d7da
```

---

## Performance Comparison

### File-Based Latency

```mermaid
graph LR
    Start[Command] --> Read[Read File<br/>~5ms]
    Read --> Parse[Parse<br/>~1ms]
    Parse --> Execute[Execute<br/>immediate]

    style Start fill:#e1f5ff
    style Execute fill:#d4edda
```

**Total**: ~5ms overhead

### MCP Latency (First Call)

```mermaid
graph LR
    Start[Command] --> IPC1[IPC to Server<br/>~5ms]
    IPC1 --> Find[Find Project<br/>~5ms]
    Find --> Read[Read Template<br/>~5ms]
    Read --> Process[Process<br/>~10ms]
    Process --> IPC2[IPC to Client<br/>~5ms]
    IPC2 --> Execute[Execute<br/>immediate]

    style Start fill:#e1f5ff
    style Execute fill:#d4edda
```

**Total**: ~30ms overhead (first call)

### MCP Latency (Cached)

```mermaid
graph LR
    Start[Command] --> IPC1[IPC to Server<br/>~5ms]
    IPC1 --> Cache[Get from Cache<br/>~2ms]
    Cache --> IPC2[IPC to Client<br/>~5ms]
    IPC2 --> Execute[Execute<br/>immediate]

    style Start fill:#e1f5ff
    style Execute fill:#d4edda
```

**Total**: ~12ms overhead (cached)

---

## Complexity Comparison

### Codebase Modules

```mermaid
graph TB
    subgraph "File-Based (~2,500 LOC)"
        FB_CLI[CLI<br/>60 LOC]
        FB_Index[Index<br/>630 LOC]
        FB_Utils[Utils<br/>260 LOC]
        FB_Meta[Metadata<br/>120 LOC]
        FB_Conflict[Conflict Detector<br/>150 LOC]
        FB_Prompts[Interactive Prompts<br/>100 LOC]
        FB_Types[Types<br/>290 LOC]

        FB_CLI --> FB_Index
        FB_Index --> FB_Utils
        FB_Index --> FB_Meta
        FB_Index --> FB_Conflict
        FB_Index --> FB_Prompts
    end

    subgraph "MCP Approach (~800 LOC)"
        MCP_Server[Server<br/>200 LOC]
        MCP_Prompts[Prompts<br/>250 LOC]
        MCP_Template[Template Engine<br/>150 LOC]
        MCP_Hooks[Hooks<br/>100 LOC]
        MCP_Types[Types<br/>100 LOC]

        MCP_Server --> MCP_Prompts
        MCP_Prompts --> MCP_Template
        MCP_Prompts --> MCP_Hooks
    end

    style FB_Index fill:#f8d7da
    style FB_Utils fill:#f8d7da
    style FB_Meta fill:#f8d7da
    style FB_Conflict fill:#f8d7da
    style MCP_Server fill:#d4edda
```

**Reduction**: 70% less code

---

## Legend

```mermaid
graph LR
    User[User Action]
    Process[Process/Operation]
    Decision{Decision Point}
    Success[Success State]
    Error[Error State]

    style User fill:#e1f5ff
    style Process fill:#ffffff
    style Success fill:#d4edda
    style Error fill:#f8d7da
```

---

**See Also**:
- [`mcp-architecture-analysis.md`](./mcp-architecture-analysis.md) - Full technical details
- [`executive-summary.md`](./executive-summary.md) - High-level overview
- [`quick-reference.md`](./quick-reference.md) - Side-by-side comparison
