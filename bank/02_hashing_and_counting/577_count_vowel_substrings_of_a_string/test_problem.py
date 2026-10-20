from solution import count_vowel_substrings


def test_count_vowel_substrings_example_one():
    assert count_vowel_substrings("aeiouu") == 2


def test_count_vowel_substrings_missing_vowels():
    assert count_vowel_substrings("unicornarihan") == 0


def test_count_vowel_substrings_example_three():
    assert count_vowel_substrings("cuaieuouac") == 7


def test_count_vowel_substrings_exact_five():
    assert count_vowel_substrings("aeiou") == 1


def test_count_vowel_substrings_consonant_splits():
    assert count_vowel_substrings("aeiouxaeiou") == 2


def test_count_vowel_substrings_leading_repeat():
    assert count_vowel_substrings("aaeiou") == 2
