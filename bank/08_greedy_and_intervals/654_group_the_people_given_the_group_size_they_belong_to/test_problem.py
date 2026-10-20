from solution import group_the_people


def is_valid_grouping(group_sizes: list[int], groups: list[list[int]]) -> bool:
    people = sorted(p for g in groups for p in g)
    if people != list(range(len(group_sizes))):
        return False
    return all(group_sizes[p] == len(g) for g in groups for p in g)


def test_group_the_people_example_one():
    sizes = [3, 3, 3, 3, 3, 1, 3]
    groups = group_the_people(sizes)
    assert is_valid_grouping(sizes, groups)
    assert len(groups) == 3


def test_group_the_people_example_two():
    sizes = [2, 1, 3, 3, 3, 2]
    groups = group_the_people(sizes)
    assert is_valid_grouping(sizes, groups)
    assert len(groups) == 3


def test_group_the_people_single_person():
    assert group_the_people([1]) == [[0]]


def test_group_the_people_all_alone():
    sizes = [1, 1, 1]
    groups = group_the_people(sizes)
    assert is_valid_grouping(sizes, groups)
    assert len(groups) == 3


def test_group_the_people_one_big_group():
    assert sorted(map(sorted, group_the_people([4, 4, 4, 4]))) == [[0, 1, 2, 3]]
