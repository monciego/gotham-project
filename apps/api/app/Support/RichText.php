<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Journal entries arrive as HTML from the web editor. Only basic formatting
 * survives, with every attribute removed, so stored HTML is safe to render.
 */
class RichText
{
    private const ALLOWED = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
        'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'hr',
    ];

    /** Removed along with their content rather than unwrapped. */
    private const DROPPED = ['script', 'style', 'iframe', 'object', 'embed', 'template', 'svg', 'math', 'head', 'title'];

    public static function clean(string $html): string
    {
        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML(
            '<?xml encoding="UTF-8"><div>'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET,
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $document->getElementsByTagName('div')->item(0);
        if ($root === null) {
            return '';
        }

        self::sanitize($root);

        $clean = '';
        foreach ($root->childNodes as $child) {
            $clean .= $document->saveHTML($child);
        }

        return trim($clean);
    }

    /** The words without markup, blocks separated by spaces. */
    public static function plain(string $html): string
    {
        $text = strip_tags(str_replace('<', ' <', $html));

        return trim(preg_replace('/\s+/u', ' ', html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    }

    private static function sanitize(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMElement) {
                $tag = strtolower($child->tagName);

                if (in_array($tag, self::DROPPED, true)) {
                    $node->removeChild($child);

                    continue;
                }

                self::sanitize($child);

                if (! in_array($tag, self::ALLOWED, true)) {
                    // Keep the text, lose the tag.
                    while ($child->firstChild) {
                        $node->insertBefore($child->firstChild, $child);
                    }
                    $node->removeChild($child);

                    continue;
                }

                while ($child->attributes->length > 0) {
                    $child->removeAttribute($child->attributes->item(0)->nodeName);
                }
            } elseif ($child->nodeType !== XML_TEXT_NODE) {
                // Comments, processing instructions, CDATA.
                $node->removeChild($child);
            }
        }
    }
}
