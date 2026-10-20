from solution import sort_string


def test_sort_string_repeated_letters():
    assert sort_string("aaaabbbbcccc") == "abccbaabccba"


def test_sort_string_distinct_letters():
    assert sort_string("rat") == "art"


def test_sort_string_single_letter():
    assert sort_string("a") == "a"


def test_sort_string_one_letter_repeated():
    assert sort_string("zzz") == "zzz"


def test_sort_string_word():
    assert sort_string("leetcode") == "cdelotee"


def test_sort_string_uneven_counts():
    assert sort_string("spo") == "ops"
