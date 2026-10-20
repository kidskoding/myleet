from solution import min_remove_to_make_valid


def test_min_remove_to_make_valid_extra_close():
    assert min_remove_to_make_valid("lee(t(c)o)de)") == "lee(t(c)o)de"


def test_min_remove_to_make_valid_leading_close():
    assert min_remove_to_make_valid("a)b(c)d") == "ab(c)d"


def test_min_remove_to_make_valid_removes_everything():
    assert min_remove_to_make_valid("))((") == ""
