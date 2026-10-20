from solution import vowel_strings


def test_vowel_strings_example_one():
    assert vowel_strings(["are", "amy", "u"], 0, 2) == 2


def test_vowel_strings_example_two():
    assert vowel_strings(["hey", "aeo", "mu", "ooo", "artro"], 1, 4) == 3


def test_vowel_strings_single_consonant():
    assert vowel_strings(["b"], 0, 0) == 0


def test_vowel_strings_single_vowel_letter():
    assert vowel_strings(["a"], 0, 0) == 1


def test_vowel_strings_range_excludes_matches():
    assert vowel_strings(["aa", "bb", "ee"], 1, 1) == 0
