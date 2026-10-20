from solution import num_of_ways


def test_num_of_ways_example_one_row():
    assert num_of_ways(1) == 12


def test_num_of_ways_example_large():
    assert num_of_ways(5000) == 30228214


def test_num_of_ways_two_rows():
    assert num_of_ways(2) == 54


def test_num_of_ways_three_rows():
    assert num_of_ways(3) == 246
