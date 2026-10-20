from solution import spellchecker


def test_spellchecker_example():
    wordlist = ["KiTe", "kite", "hare", "Hare"]
    queries = ["kite", "Kite", "KiTe", "Hare", "HARE", "Hear", "hear", "keti", "keet", "keto"]
    assert spellchecker(wordlist, queries) == ["kite", "KiTe", "KiTe", "Hare", "hare", "", "", "KiTe", "", "KiTe"]


def test_spellchecker_case_only():
    assert spellchecker(["yellow"], ["YellOw"]) == ["yellow"]


def test_spellchecker_first_case_match_wins():
    assert spellchecker(["ab", "AB"], ["Ab"]) == ["ab"]


def test_spellchecker_exact_beats_case_match():
    assert spellchecker(["Ab", "ab"], ["ab"]) == ["ab"]


def test_spellchecker_vowel_swap():
    assert spellchecker(["bat", "bet"], ["BIT"]) == ["bat"]


def test_spellchecker_no_match():
    assert spellchecker(["abc"], ["abcd", "xyz", "bc"]) == ["", "", ""]
