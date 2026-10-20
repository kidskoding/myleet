from solution import people_indexes


def test_people_indexes_example_one():
    favorites = [
        ["leetcode", "google", "facebook"],
        ["google", "microsoft"],
        ["google", "facebook"],
        ["google"],
        ["amazon"],
    ]
    assert people_indexes(favorites) == [0, 1, 4]


def test_people_indexes_example_two():
    favorites = [["leetcode", "google", "facebook"], ["leetcode", "amazon"], ["facebook", "google"]]
    assert people_indexes(favorites) == [0, 1]


def test_people_indexes_example_disjoint():
    assert people_indexes([["leetcode"], ["google"], ["facebook"], ["amazon"]]) == [0, 1, 2, 3]


def test_people_indexes_single_person():
    assert people_indexes([["apple", "netflix"]]) == [0]


def test_people_indexes_chain_of_subsets():
    assert people_indexes([["a"], ["a", "b"], ["a", "b", "c"]]) == [2]
