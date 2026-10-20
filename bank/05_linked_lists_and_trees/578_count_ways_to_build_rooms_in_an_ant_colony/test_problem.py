from solution import ways_to_build_rooms


def test_ways_to_build_rooms_chain():
    assert ways_to_build_rooms([-1, 0, 1]) == 1


def test_ways_to_build_rooms_two_branches():
    assert ways_to_build_rooms([-1, 0, 0, 1, 2]) == 6


def test_ways_to_build_rooms_two_rooms():
    assert ways_to_build_rooms([-1, 0]) == 1


def test_ways_to_build_rooms_star():
    assert ways_to_build_rooms([-1, 0, 0, 0]) == 6


def test_ways_to_build_rooms_uneven_branches():
    assert ways_to_build_rooms([-1, 0, 0, 1, 1]) == 8
