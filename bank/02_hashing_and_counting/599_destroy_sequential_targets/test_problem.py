from solution import destroy_targets


def test_destroy_targets_example_one():
    assert destroy_targets([3, 7, 8, 1, 1, 5], 2) == 1


def test_destroy_targets_example_two():
    assert destroy_targets([1, 3, 5, 2, 4, 6], 2) == 1


def test_destroy_targets_huge_space():
    assert destroy_targets([6, 2, 5], 100) == 2


def test_destroy_targets_single():
    assert destroy_targets([7], 3) == 7


def test_destroy_targets_space_one_hits_all():
    assert destroy_targets([5, 3, 9], 1) == 3


def test_destroy_targets_tied_groups_pick_smallest_seed():
    assert destroy_targets([4, 2, 3, 5], 2) == 2
