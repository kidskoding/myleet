from solution import letter_case_permutation


def test_letter_case_permutation_letters_and_digits():
    assert sorted(letter_case_permutation("a1b2")) == sorted(["a1b2", "a1B2", "A1b2", "A1B2"])


def test_letter_case_permutation_single_letter():
    assert sorted(letter_case_permutation("3z4")) == ["3Z4", "3z4"]


def test_letter_case_permutation_no_letters():
    assert letter_case_permutation("12") == ["12"]
