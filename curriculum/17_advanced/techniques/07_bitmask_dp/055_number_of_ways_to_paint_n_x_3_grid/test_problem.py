from solution import num_of_ways


def test_num_of_ways_one():
    assert num_of_ways(1) == 12


def test_num_of_ways_two():
    assert num_of_ways(2) == 54


def test_num_of_ways_seven():
    assert num_of_ways(7) == 106494
