from solution import is_solvable


def test_is_solvable_send_more_money():
    assert is_solvable(["SEND", "MORE"], "MONEY") is True


def test_is_solvable_three_words():
    assert is_solvable(["SIX", "SEVEN", "SEVEN"], "TWENTY") is True


def test_is_solvable_impossible():
    assert is_solvable(["LEET", "CODE"], "POINT") is False


def test_is_solvable_this_is_too_funny():
    assert is_solvable(["THIS", "IS", "TOO"], "FUNNY") is True


def test_is_solvable_single_letters():
    assert is_solvable(["A", "A"], "B") is True


def test_is_solvable_result_too_short():
    assert is_solvable(["AB", "AB"], "C") is False
