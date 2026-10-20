from solution import words_abbreviation


def test_words_abbreviation_mixed_list():
    words = ["like", "god", "internal", "me", "internet", "interval", "intension", "face", "intrusion"]
    expected = ["l2e", "god", "internal", "me", "i6t", "interval", "inte4n", "f2e", "intr4n"]
    assert words_abbreviation(words) == expected


def test_words_abbreviation_short_words_unchanged():
    assert words_abbreviation(["aa", "aaa"]) == ["aa", "aaa"]


def test_words_abbreviation_clash_resolved_by_prefix():
    assert words_abbreviation(["abcdef", "abndef"]) == ["abc2f", "abn2f"]


def test_words_abbreviation_single_word():
    assert words_abbreviation(["localization"]) == ["l10n"]


def test_words_abbreviation_only_similar_words_grow():
    assert words_abbreviation(["abcdefgz", "abcxefgz", "ayyyyyyz"]) == ["abcd3z", "abcx3z", "ay5z"]
