from solution import delete_duplicate_folder


def test_delete_duplicate_folder_example_one():
    paths = [["a"], ["c"], ["d"], ["a", "b"], ["c", "b"], ["d", "a"]]
    assert sorted(delete_duplicate_folder(paths)) == [["d"], ["d", "a"]]


def test_delete_duplicate_folder_nested_duplicates():
    paths = [["a"], ["c"], ["a", "b"], ["c", "b"], ["a", "b", "x"], ["a", "b", "x", "y"], ["w"], ["w", "y"]]
    assert sorted(delete_duplicate_folder(paths)) == [["a"], ["a", "b"], ["c"], ["c", "b"]]


def test_delete_duplicate_folder_all_unique():
    paths = [["a", "b"], ["c", "d"], ["c"], ["a"]]
    assert sorted(delete_duplicate_folder(paths)) == [["a"], ["a", "b"], ["c"], ["c", "d"]]


def test_delete_duplicate_folder_single_folder():
    assert delete_duplicate_folder([["a"]]) == [["a"]]


def test_delete_duplicate_folder_empty_leaves_are_not_identical():
    assert sorted(delete_duplicate_folder([["a"], ["b"]])) == [["a"], ["b"]]


def test_delete_duplicate_folder_removes_matching_top_level():
    paths = [["a"], ["a", "x"], ["b"], ["b", "x"], ["c"]]
    assert delete_duplicate_folder(paths) == [["c"]]
