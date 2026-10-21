from list_node import ListNode
from solution import insertion_sort_list


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_insertion_sort_list_unsorted():
    assert to_list(insertion_sort_list(build_list([4, 2, 1, 3]))) == [1, 2, 3, 4]


def test_insertion_sort_list_with_negatives():
    assert to_list(insertion_sort_list(build_list([-1, 5, 3, 4, 0]))) == [-1, 0, 3, 4, 5]


def test_insertion_sort_list_already_sorted():
    assert to_list(insertion_sort_list(build_list([1, 2, 3]))) == [1, 2, 3]


def test_insertion_sort_list_empty():
    assert insertion_sort_list(None) is None
