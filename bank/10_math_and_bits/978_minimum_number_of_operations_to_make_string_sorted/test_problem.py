from solution import make_string_sorted


def test_make_string_sorted_reverse():
    assert make_string_sorted("cba") == 5


def test_make_string_sorted_repeated_letters():
    assert make_string_sorted("aabaa") == 2


def test_make_string_sorted_single():
    assert make_string_sorted("a") == 0


def test_make_string_sorted_already_sorted():
    assert make_string_sorted("abc") == 0


def test_make_string_sorted_five_letters():
    assert make_string_sorted("cdbea") == 63


def test_make_string_sorted_modulo():
    assert make_string_sorted("leetcodeleetcodeleetcode") == 982157772
