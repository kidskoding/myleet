from solution import title_to_number


def test_title_to_number_single_letter():
    assert title_to_number("A") == 1


def test_title_to_number_double_letter():
    assert title_to_number("AB") == 28


def test_title_to_number_zz():
    assert title_to_number("ZY") == 701
