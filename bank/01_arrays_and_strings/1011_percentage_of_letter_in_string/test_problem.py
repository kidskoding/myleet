from solution import percentage_letter


def test_percentage_letter_rounds_down():
    assert percentage_letter("foobar", "o") == 33


def test_percentage_letter_absent():
    assert percentage_letter("jjjj", "k") == 0


def test_percentage_letter_all_match():
    assert percentage_letter("jjjj", "j") == 100


def test_percentage_letter_half():
    assert percentage_letter("ab", "a") == 50


def test_percentage_letter_single_char():
    assert percentage_letter("x", "x") == 100
