from solution import check_valid_string


def test_check_valid_string_simple():
    assert check_valid_string("()") is True


def test_check_valid_string_star_as_empty():
    assert check_valid_string("(*)") is True


def test_check_valid_string_star_as_open():
    assert check_valid_string("(*))") is True


def test_check_valid_string_empty():
    assert check_valid_string("") is True


def test_check_valid_string_unmatched():
    assert check_valid_string("(") is False
    assert check_valid_string(")(") is False
    assert check_valid_string("((*") is False


def test_check_valid_string_order_matters():
    assert check_valid_string("*(") is False
    assert check_valid_string(")*") is False
    assert check_valid_string("(((******))") is True
    assert check_valid_string("(*()") is True
