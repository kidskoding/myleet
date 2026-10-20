from solution import min_add_to_make_valid


def test_min_add_to_make_valid_extra_close():
    assert min_add_to_make_valid("())") == 1


def test_min_add_to_make_valid_all_open():
    assert min_add_to_make_valid("(((") == 3


def test_min_add_to_make_valid_already_valid():
    assert min_add_to_make_valid("()") == 0
