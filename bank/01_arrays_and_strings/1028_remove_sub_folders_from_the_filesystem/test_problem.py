from solution import remove_subfolders


def test_remove_subfolders_mixed():
    result = remove_subfolders(["/a", "/a/b", "/c/d", "/c/d/e", "/c/f"])
    assert sorted(result) == ["/a", "/c/d", "/c/f"]


def test_remove_subfolders_deep_children():
    assert sorted(remove_subfolders(["/a", "/a/b/c", "/a/b/d"])) == ["/a"]


def test_remove_subfolders_shared_prefix_not_parent():
    result = remove_subfolders(["/a/b/c", "/a/b/ca", "/a/b/d"])
    assert sorted(result) == ["/a/b/c", "/a/b/ca", "/a/b/d"]


def test_remove_subfolders_single():
    assert remove_subfolders(["/x"]) == ["/x"]


def test_remove_subfolders_unsorted_input():
    result = remove_subfolders(["/c/d/e", "/b", "/c/d", "/b/x/y"])
    assert sorted(result) == ["/b", "/c/d"]
