from list_node import ListNode
from solution import split_list_to_parts


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


def test_split_list_to_parts_uneven():
    parts = split_list_to_parts(build_list([1, 2, 3]), 5)
    assert [to_list(part) for part in parts] == [[1], [2], [3], [], []]


def test_split_list_to_parts_balanced():
    parts = split_list_to_parts(build_list([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 3)
    assert [to_list(part) for part in parts] == [
        [1, 2, 3, 4],
        [5, 6, 7],
        [8, 9, 10],
    ]
