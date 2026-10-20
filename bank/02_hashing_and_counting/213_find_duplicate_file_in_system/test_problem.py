from solution import find_duplicate


def canonical(groups: list[list[str]]) -> list[list[str]]:
    return sorted(sorted(group) for group in groups)


def test_find_duplicate_example():
    paths = ["root/a 1.txt(abcd) 2.txt(efgh)", "root/c 3.txt(abcd)", "root/c/d 4.txt(efgh)", "root 4.txt(efgh)"]
    expected = [["root/4.txt", "root/a/2.txt", "root/c/d/4.txt"], ["root/a/1.txt", "root/c/3.txt"]]
    assert canonical(find_duplicate(paths)) == canonical(expected)


def test_find_duplicate_none():
    assert find_duplicate(["root/a 1.txt(abc) 2.txt(xyz)", "root/b 3.txt(lmn)"]) == []


def test_find_duplicate_same_directory():
    assert canonical(find_duplicate(["root x.txt(q) y.txt(q)"])) == [["root/x.txt", "root/y.txt"]]


def test_find_duplicate_single_file():
    assert find_duplicate(["root a.txt(content)"]) == []


def test_find_duplicate_content_with_dots():
    paths = ["dir a.txt(1.2.3)", "dir/sub b.txt(1.2.3) c.txt(1.2)"]
    assert canonical(find_duplicate(paths)) == [["dir/a.txt", "dir/sub/b.txt"]]
