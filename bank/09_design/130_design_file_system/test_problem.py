from solution import FileSystem


def test_file_system_create_and_get():
    fs = FileSystem()
    assert fs.create_path("/a", 1) is True
    assert fs.get("/a") == 1


def test_file_system_nested_path():
    fs = FileSystem()
    assert fs.create_path("/leet", 1) is True
    assert fs.create_path("/leet/code", 2) is True
    assert fs.get("/leet/code") == 2


def test_file_system_missing_parent_fails():
    fs = FileSystem()
    assert fs.create_path("/c/d", 1) is False
    assert fs.get("/c") == -1
    assert fs.get("/c/d") == -1


def test_file_system_duplicate_path_fails():
    fs = FileSystem()
    assert fs.create_path("/a", 1) is True
    assert fs.create_path("/a", 5) is False
    assert fs.get("/a") == 1


def test_file_system_unknown_path():
    fs = FileSystem()
    fs.create_path("/abc", 3)
    assert fs.get("/ab") == -1
    assert fs.create_path("/ab/c", 4) is False
