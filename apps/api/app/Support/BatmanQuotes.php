<?php

namespace App\Support;

/**
 * Quotes for the HQ morning brief.
 */
class BatmanQuotes
{
    /** @var list<array{text: string, author: string}> */
    public const ALL = [
        ['text' => 'Why do we fall, sir? So that we can learn to pick ourselves up.', 'author' => 'Alfred Pennyworth'],
        ['text' => "It's not who I am underneath, but what I do that defines me.", 'author' => 'Batman'],
        ['text' => 'The night is darkest just before the dawn. And I promise you, the dawn is coming.', 'author' => 'Harvey Dent'],
        ['text' => "Endure, Master Wayne. Take it. They'll hate you for it, but that's the point of Batman.", 'author' => 'Alfred Pennyworth'],
        ['text' => 'A hero can be anyone.', 'author' => 'Batman'],
        ['text' => 'The training is nothing! The will is everything!', 'author' => "Ra's al Ghul"],
        ['text' => 'To conquer fear, you must become fear.', 'author' => "Ra's al Ghul"],
        ['text' => 'Theatricality and deception are powerful agents to the uninitiated.', 'author' => "Ra's al Ghul"],
        ['text' => "Sometimes the truth isn't good enough. Sometimes people deserve more.", 'author' => 'Batman'],
        ['text' => 'Batman has no limits.', 'author' => 'Bruce Wayne'],
        ['text' => 'Know your limits, Master Wayne.', 'author' => 'Alfred Pennyworth'],
        ['text' => 'I seek the means to fight injustice. To turn fear against those who prey on the fearful.', 'author' => 'Bruce Wayne'],
        ['text' => 'People need dramatic examples to shake them out of apathy.', 'author' => 'Bruce Wayne'],
        ['text' => 'As a man, I can be ignored, I can be destroyed. But as a symbol, I can be incorruptible.', 'author' => 'Bruce Wayne'],
        ['text' => "Criminals aren't complicated. Just have to figure out what he's after.", 'author' => 'Bruce Wayne'],
        ['text' => "He's the hero Gotham deserves, but not the one it needs right now.", 'author' => 'James Gordon'],
        ['text' => 'The idea was to be a symbol. Batman could be anybody. That was the point.', 'author' => 'Bruce Wayne'],
        ['text' => 'Your anger gives you great power. But if you let it, it will destroy you.', 'author' => "Ra's al Ghul"],
        ['text' => 'You have learned to bury your guilt with anger. I will teach you to confront it.', 'author' => "Ra's al Ghul"],
        ['text' => "Vengeance won't change the past. I have to become more.", 'author' => 'Batman'],
        ['text' => 'Justice is about harmony. Revenge is about you making yourself feel better.', 'author' => 'Rachel Dawes'],
    ];

    /**
     * A random quote that stays the same all day for a user, so refetching HQ
     * doesn't swap it.
     *
     * @return array{text: string, author: string}
     */
    public static function forDay(int $userId, string $date): array
    {
        return self::ALL[crc32("{$userId}:{$date}") % count(self::ALL)];
    }
}
