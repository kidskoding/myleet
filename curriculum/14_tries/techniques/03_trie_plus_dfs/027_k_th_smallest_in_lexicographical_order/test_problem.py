from solution import find_kth_number


def test_find_kth_number_normal():
    assert find_kth_number(13, 2) == 10


def test_find_kth_number_first():
    assert find_kth_number(1, 1) == 1


def test_find_kth_number_small_n():
    # lex order for n=13: 1,10,11,12,13,2,3,4,5,6,7,8,9
    assert find_kth_number(13, 1) == 1
    assert find_kth_number(13, 6) == 2
    assert find_kth_number(13, 13) == 9


def test_find_kth_number_larger():
    assert find_kth_number(100, 10) == 17
