from solution import count_lattice_points


def test_count_lattice_points_single_unit_circle():
    assert count_lattice_points([[2, 2, 1]]) == 5


def test_count_lattice_points_two_overlapping_circles():
    assert count_lattice_points([[2, 2, 2], [3, 4, 1]]) == 16


def test_count_lattice_points_radius_two():
    assert count_lattice_points([[2, 2, 2]]) == 13


def test_count_lattice_points_duplicate_circles():
    assert count_lattice_points([[2, 2, 1], [2, 2, 1]]) == 5


def test_count_lattice_points_disjoint_circles():
    assert count_lattice_points([[1, 1, 1], [5, 5, 1]]) == 10


def test_count_lattice_points_nested_circles():
    assert count_lattice_points([[5, 5, 3], [5, 5, 1]]) == 29
