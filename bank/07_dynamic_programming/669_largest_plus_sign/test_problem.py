from solution import order_of_largest_plus_sign


def test_order_of_largest_plus_sign_example_one():
    assert order_of_largest_plus_sign(5, [[4, 2]]) == 2


def test_order_of_largest_plus_sign_all_mines():
    assert order_of_largest_plus_sign(1, [[0, 0]]) == 0


def test_order_of_largest_plus_sign_single_free_cell():
    assert order_of_largest_plus_sign(1, []) == 1


def test_order_of_largest_plus_sign_no_mines():
    assert order_of_largest_plus_sign(5, []) == 3


def test_order_of_largest_plus_sign_center_mine():
    assert order_of_largest_plus_sign(3, [[1, 1]]) == 1


def test_order_of_largest_plus_sign_even_grid():
    assert order_of_largest_plus_sign(4, []) == 2
