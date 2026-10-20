from solution import FileSystem


def test_file_system_empty_root():
    fs = FileSystem()
    assert fs.ls("/") == []


def test_file_system_mkdir_and_file():
    fs = FileSystem()
    fs.mkdir("/a/b/c")
    fs.add_content_to_file("/a/b/c/d", "hello")
    assert fs.ls("/") == ["a"]
    assert fs.ls("/a/b/c") == ["d"]
    assert fs.read_content_from_file("/a/b/c/d") == "hello"


def test_file_system_ls_on_file_returns_its_name():
    fs = FileSystem()
    fs.mkdir("/docs")
    fs.add_content_to_file("/docs/notes", "x")
    assert fs.ls("/docs/notes") == ["notes"]


def test_file_system_append_content():
    fs = FileSystem()
    fs.add_content_to_file("/log", "ab")
    fs.add_content_to_file("/log", "cd")
    assert fs.read_content_from_file("/log") == "abcd"


def test_file_system_ls_sorts_files_and_directories():
    fs = FileSystem()
    fs.mkdir("/zeta")
    fs.mkdir("/alpha/inner")
    fs.add_content_to_file("/mid", "m")
    fs.add_content_to_file("/beta", "b")
    assert fs.ls("/") == ["alpha", "beta", "mid", "zeta"]
    assert fs.ls("/alpha") == ["inner"]
    assert fs.ls("/zeta") == []


def test_file_system_mkdir_existing_keeps_contents():
    fs = FileSystem()
    fs.mkdir("/a/b")
    fs.add_content_to_file("/a/b/f", "data")
    fs.mkdir("/a/b")
    fs.mkdir("/a/b/c")
    assert fs.ls("/a/b") == ["c", "f"]
    assert fs.read_content_from_file("/a/b/f") == "data"
