<?php

namespace Tbtop\Admin\Mcp;

/**
 * Checks an agent-written Lexical editor state before the handler stores it: the browser
 * editor drops unknown nodes and fails on missing keys, so such a document would save but not open.
 */
final class RichtextDocument
{
    private const ELEMENT = ['children', 'format', 'indent', 'direction'];

    private const TEXT = ['text', 'format', 'detail', 'mode', 'style'];

    /** Node types the editor registers, with the keys Lexical 0.44 reads on import. */
    private const NODES = [
        'paragraph' => self::ELEMENT,
        'text' => self::TEXT,
        'linebreak' => [],
        'tab' => self::TEXT,
        'heading' => [...self::ELEMENT, 'tag'],
        'quote' => self::ELEMENT,
        'list' => [...self::ELEMENT, 'listType', 'start'],
        'listitem' => [...self::ELEMENT, 'value'],
        'code' => self::ELEMENT,
        'code-highlight' => self::TEXT,
        'link' => [...self::ELEMENT, 'url'],
        'autolink' => [...self::ELEMENT, 'url'],
        'embed' => ['id', 'kind', 'data', 'version'],
    ];

    /** @return list<string> */
    public static function nodeTypes(): array
    {
        return array_keys(self::NODES);
    }

    /** $value is the document stored at input key $key; null is an empty editor. */
    public static function assertValid(string $key, mixed $value): void
    {
        if ($value === null) {
            return;
        }
        $root = is_array($value) ? ($value['root'] ?? null) : null;
        if (! is_array($root) || ($root['type'] ?? null) !== 'root') {
            throw new AgentError("{$key}: richtext must be a Lexical editor state {root: {...}}.");
        }
        self::assertNode($key, $root, 'root', self::ELEMENT);
    }

    /**
     * @param  array<mixed>  $node
     * @param  list<string>  $needs
     */
    private static function assertNode(string $key, array $node, string $path, array $needs): void
    {
        $type = (string) $node['type'];
        foreach ($needs as $need) {
            if (! array_key_exists($need, $node) || ($need === 'children' && ! is_array($node[$need]))) {
                throw new AgentError("{$key}: richtext node \"{$type}\" at {$path} needs {$need}.");
            }
        }
        foreach (is_array($node['children'] ?? null) ? $node['children'] : [] as $i => $child) {
            $at = "{$path}.children[{$i}]";
            $childType = is_array($child) ? ($child['type'] ?? null) : null;
            if (! is_string($childType)) {
                throw new AgentError("{$key}: richtext node at {$at} needs type.");
            }
            if (! isset(self::NODES[$childType])) {
                $allowed = implode(', ', self::nodeTypes());
                throw new AgentError("{$key}: unknown richtext node \"{$childType}\" at {$at}; allowed: {$allowed}.");
            }
            self::assertNode($key, $child, $at, self::NODES[$childType]);
        }
    }
}
