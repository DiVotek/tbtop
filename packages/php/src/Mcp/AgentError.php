<?php

namespace Tbtop\Admin\Mcp;

use RuntimeException;

/** A tool call the agent can fix (unknown id, missing params, …); its message goes back verbatim. */
final class AgentError extends RuntimeException {}
