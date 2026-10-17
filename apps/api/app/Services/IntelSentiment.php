<?php

namespace App\Services;

/**
 * Keyword-based sentiment, no external service. The score is
 * (positive − negative keyword hits) / words; beyond ±0.02 it's labelled
 * positive or negative.
 */
class IntelSentiment
{
    public const POSITIVE = [
        'great', 'amazing', 'productive', 'happy', 'accomplished', 'proud',
        'grateful', 'excellent', 'wonderful', 'fantastic',
    ];

    public const NEGATIVE = [
        'terrible', 'awful', 'horrible', 'stressed', 'anxious', 'overwhelmed',
        'exhausted', 'burned out', "can't", 'hopeless', 'depressed', 'struggling',
    ];

    /** Signs of burnout Alfred responds to straight away. */
    private const BURNOUT = '/\b(exhausted|overwhelmed|burn(ed|t) out|can\'t( do this| take (it|this)| go on)? anymore)\b/u';

    private const THRESHOLD = 0.02;

    /** @return array{score: float, label: string} */
    public function analyze(string $text): array
    {
        $text = $this->normalize($text);
        $words = preg_match_all("/[\\p{L}\\p{N}']+/u", $text);

        if ($words === 0) {
            return ['score' => 0.0, 'label' => 'neutral'];
        }

        $score = ($this->hits($text, self::POSITIVE) - $this->hits($text, self::NEGATIVE)) / $words;
        $score = round(max(-1, min(1, $score)), 4);

        return [
            'score' => $score,
            'label' => match (true) {
                $score > self::THRESHOLD => 'positive',
                $score < -self::THRESHOLD => 'negative',
                default => 'neutral',
            },
        ];
    }

    public function soundsBurnedOut(string $text): bool
    {
        return preg_match(self::BURNOUT, $this->normalize($text)) === 1;
    }

    /** Lowercase, with curly apostrophes straightened so "can’t" matches. */
    private function normalize(string $text): string
    {
        return str_replace(['’', '‘'], "'", mb_strtolower($text));
    }

    /** @param  list<string>  $keywords */
    private function hits(string $text, array $keywords): int
    {
        return collect($keywords)->sum(
            fn (string $keyword) => preg_match_all('/(?<![\p{L}\'])'.preg_quote($keyword, '/').'(?![\p{L}\'])/u', $text)
        );
    }
}
