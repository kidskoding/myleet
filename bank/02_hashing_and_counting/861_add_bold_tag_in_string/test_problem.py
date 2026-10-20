from solution import add_bold_tag


def test_add_bold_tag_two_separate_runs():
    assert add_bold_tag("abcxyz123", ["abc", "123"]) == "<b>abc</b>xyz<b>123</b>"


def test_add_bold_tag_merges_into_whole_string():
    assert add_bold_tag("aaabbb", ["aa", "b"]) == "<b>aaabbb</b>"


def test_add_bold_tag_no_words():
    assert add_bold_tag("abc", []) == "abc"


def test_add_bold_tag_overlapping_occurrences():
    assert add_bold_tag("aaab", ["aa"]) == "<b>aaa</b>b"


def test_add_bold_tag_touching_occurrences_merge():
    assert add_bold_tag("abcdef", ["abc", "def"]) == "<b>abcdef</b>"


def test_add_bold_tag_word_not_present():
    assert add_bold_tag("xyz", ["a", "xyzw"]) == "xyz"
