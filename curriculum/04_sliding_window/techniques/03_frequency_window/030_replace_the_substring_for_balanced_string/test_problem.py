from solution import balanced_string


def test_balanced_string_already_balanced():
    assert balanced_string("QWER") == 0


def test_balanced_string_one_replacement():
    assert balanced_string("QQWE") == 1


def test_balanced_string_two_replacements():
    assert balanced_string("QQQW") == 2
