from solution import maximum_length_substring


def test_maximum_length_substring_example_one():
    assert maximum_length_substring("bcbbbcba") == 4


def test_maximum_length_substring_all_same():
    assert maximum_length_substring("aaaa") == 2


def test_maximum_length_substring_two_letters():
    assert maximum_length_substring("ab") == 2


def test_maximum_length_substring_whole_string_valid():
    assert maximum_length_substring("abcabc") == 6


def test_maximum_length_substring_third_copy_at_end():
    assert maximum_length_substring("aabba") == 4
