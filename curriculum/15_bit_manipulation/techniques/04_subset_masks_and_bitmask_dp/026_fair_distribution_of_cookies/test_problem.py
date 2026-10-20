from solution import distribute_cookies


def test_distribute_cookies_two_children():
    assert distribute_cookies([8, 15, 10, 20, 8], 2) == 31


def test_distribute_cookies_three_children():
    assert distribute_cookies([6, 1, 3, 2, 2, 4, 1, 2], 3) == 7
