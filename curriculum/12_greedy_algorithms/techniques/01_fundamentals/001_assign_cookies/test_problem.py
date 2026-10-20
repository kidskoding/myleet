from solution import assign_cookies


def test_assign_cookies_normal():
    assert assign_cookies([1, 2, 3], [1, 1]) == 1


def test_assign_cookies_all_satisfied():
    assert assign_cookies([1, 2], [1, 2, 3]) == 2


def test_assign_cookies_empty_children():
    assert assign_cookies([], [1, 2, 3]) == 0


def test_assign_cookies_empty_cookies():
    assert assign_cookies([1, 2, 3], []) == 0
