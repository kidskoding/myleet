from solution import length_longest_path


def test_length_longest_path_single_file():
    assert length_longest_path("dir\n\tsubdir1\n\tsubdir2\n\t\tfile.ext") == 20


def test_length_longest_path_two_files():
    text = "dir\n\tsubdir1\n\t\tfile1.ext\n\t\tsubsubdir1\n\tsubdir2\n\t\tsubsubdir2\n\t\t\tfile2.ext"
    assert length_longest_path(text) == 32


def test_length_longest_path_no_file():
    assert length_longest_path("a") == 0


def test_length_longest_path_file_at_root():
    assert length_longest_path("file.txt") == 8


def test_length_longest_path_shallow_file_wins():
    assert length_longest_path("a\n\tb\n\t\tc\nlongfilename.txt") == 16


def test_length_longest_path_names_with_spaces():
    assert length_longest_path("my dir\n\tmy file.txt") == 18
