from solution import lemonade_change


def test_lemonade_change_success():
    assert lemonade_change([5, 5, 5, 10, 20]) is True


def test_lemonade_change_failure():
    assert lemonade_change([5, 5, 10, 10, 20]) is False


def test_lemonade_change_single_five():
    assert lemonade_change([5]) is True


def test_lemonade_change_empty():
    assert lemonade_change([]) is True
