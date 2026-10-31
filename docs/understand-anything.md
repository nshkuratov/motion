# Understand-Anything installation

Installed for Codex from https://github.com/Egonex-AI/Understand-Anything using its official Windows PowerShell installer.

- Repository: `C:\Users\nikita\.understand-anything\repo`
- Plugin junction: `C:\Users\nikita\.understand-anything-plugin`
- Nine skill junctions: `C:\Users\nikita\.agents\skills\understand*`
- All nine SKILL.md files were checked as present and readable.

Available commands include `$understand`, `$understand-dashboard`, `$understand-chat`, `$understand-diff`, `$understand-domain`, `$understand-explain`, `$understand-figma`, `$understand-knowledge`, `$understand-onboard`.

Start analysis with `$understand --language ru`, then open `$understand-dashboard`. Dependencies for analysis/dashboard are installed by their skill workflows on first use. A knowledge graph has not been generated as part of installation. Restart Codex if the new skills are not detected on the next turn.

To update in PowerShell:

```powershell
& "$HOME\.understand-anything\repo\install.ps1" -Update
```
