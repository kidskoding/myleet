from solution import count_vowel_strings


def test_count_vowel_strings_length_one():
    assert count_vowel_strings(1) == 5


def test_count_vowel_strings_length_two():
    assert count_vowel_strings(2) == 15


def test_count_vowel_strings_long():
    assert count_vowel_strings(33) == 66045
