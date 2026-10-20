from solution import find_products_of_elements


def test_find_products_of_elements_example_one():
    assert find_products_of_elements([[1, 3, 7]]) == [4]


def test_find_products_of_elements_example_two():
    assert find_products_of_elements([[2, 5, 3], [7, 7, 4]]) == [2, 2]


def test_find_products_of_elements_first_element():
    assert find_products_of_elements([[0, 0, 10]]) == [1]


def test_find_products_of_elements_mod_one():
    assert find_products_of_elements([[0, 0, 1]]) == [0]


def test_find_products_of_elements_longer_ranges():
    assert find_products_of_elements([[1000, 5000, 77777], [12345, 54321, 99991]]) == [27029, 63037]
