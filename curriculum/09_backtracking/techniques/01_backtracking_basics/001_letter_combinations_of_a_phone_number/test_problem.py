from solution import letter_combinations


def test_letter_combinations_empty():
    assert letter_combinations("") == []


def test_letter_combinations_single_digit():
    assert sorted(letter_combinations("2")) == sorted(["a", "b", "c"])


def test_letter_combinations_two_digits():
    assert sorted(letter_combinations("23")) == sorted(["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"])
