Run `scripts/find-task-manager-root.cjs` from the user's working directory.
The script walks up looking for `.ai/task-manager/.init-metadata.json` and
prints the absolute path of the resolved root on success.

If the script exits non-zero, the working directory is not inside an
initialized task-manager workspace. Stop and ask the user to run the project
initializer (e.g. `npx @e0ipso/ai-task-manager init`) before continuing. Do
not attempt to {{action_verb_phrase}} outside of a valid root.

For every subsequent step, treat the path printed by this script as `<root>`.
