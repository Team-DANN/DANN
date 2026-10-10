"""The tools the model may call, and who may see them.

Every tool is a small wrapper around an existing Node endpoint, called with the
person's own JWT, so Node's module checks apply whatever the model tries.
The model sees only the tools that match the person's modules, and write tools
only when actions are switched on (a signing secret is configured).
"""

from auth import CurrentUser
from tools.base import Tool
from tools.batch import PROPOSE_LOG_BATCH
from tools.lookup import LOOKUP_TOOLS

ALL_TOOLS: tuple[Tool, ...] = (*LOOKUP_TOOLS, PROPOSE_LOG_BATCH)


def tools_for(user: CurrentUser, *, writes_enabled: bool = False) -> list[Tool]:
    have = set(user.modules)
    return [
        t
        for t in ALL_TOOLS
        if have & set(t.modules) and (writes_enabled or t.kind != "write")
    ]