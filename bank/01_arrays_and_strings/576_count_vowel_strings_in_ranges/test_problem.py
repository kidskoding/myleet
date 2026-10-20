from solution import vowel_strings


def test_vowel_strings_example_one():
    assert vowel_strings(["aba", "bcb", "ece", "aa", "e"], [[0, 2], [1, 4], [1, 1]]) == [2, 3, 0]


def test_vowel_strings_all_vowel_words():
    assert vowel_strings(["a", "e", "i"], [[0, 2], [0, 1], [2, 2]]) == [3, 2, 1]


def test_vowel_strings_single_consonant_word():
    assert vowel_strings(["b"], [[0, 0]]) == [0]


def test_vowel_strings_point_queries():
    assert vowel_strings(["a", "b", "a"], [[0, 2], [1, 1], [2, 2], [0, 0]]) == [2, 0, 1, 1]


def test_vowel_strings_vowel_start_only():
    assert vowel_strings(["ab", "ba", "aba"], [[0, 1], [0, 2]]) == [0, 1]
