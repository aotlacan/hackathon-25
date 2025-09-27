PRAGMA foreign_keys = ON;

INSERT INTO building(id, building_name, building_address, building_record_number, num_bathrooms)
VALUES ('0', 'BEYSTER BOB AND BETTY BUILDING', 'temp', '1005092', 13)

INSERT INTO rooms(room_id, floor, room_number, building_record_number)
('0', '04', '4823W', '2115868'),
('1', '04', '4823', '2115867'),
('2', '04', '4821M', '2115866'),
('3', '04', '4615', '2115824'),
('4', '04', '4613', '2115823'),
('5', '03', '3823W', '2115768'),
('6', '03', '3823', '2115767'),
('7', '03', '3821M', '2115766'),
('8', '03', '3613', '2115723'),
('9', '02', '2833M', '2115688'),
('10', '02', '2831W', '2115686'),
('11', '01', '1664W', '2115631'),
('12', '01', '1660M', '2115629');
